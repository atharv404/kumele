import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

interface FXRates {
  [currency: string]: number;
}

@Injectable()
export class FXService {
  private readonly logger = new Logger(FXService.name);
  private readonly PRIMARY_API = 'https://api.frankfurter.app';
  private readonly BACKUP_API = 'https://api.exchangeratesapi.io/v1';
  private readonly BASE_CURRENCY = 'EUR';
  private cachedRates: FXRates = {};
  private cacheTimestamp: Date | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Refresh FX rates every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async refreshRates() {
    this.logger.log('Refreshing FX rates...');

    try {
      const rates = await this.fetchRatesWithFallback();
      
      if (rates) {
        // Store in database
        const today = new Date().toISOString().split('T')[0];
        
        await this.prisma.fXRate.upsert({
          where: {
            date_base: {
              date: today,
              base: this.BASE_CURRENCY,
            },
          },
          create: {
            date: today,
            base: this.BASE_CURRENCY,
            rates: rates as any,
            source: 'frankfurter',
          },
          update: {
            rates: rates as any,
            source: 'frankfurter',
          },
        });

        // Update cache
        this.cachedRates = rates;
        this.cacheTimestamp = new Date();

        this.logger.log(`FX rates updated: ${Object.keys(rates).length} currencies`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to refresh FX rates: ${error.message}`);
    }
  }

  /**
   * Fetch rates with fallback to backup API
   */
  private async fetchRatesWithFallback(): Promise<FXRates | null> {
    // Try primary (Frankfurter)
    try {
      const response = await fetch(`${this.PRIMARY_API}/latest?from=${this.BASE_CURRENCY}`);
      if (response.ok) {
        const data = await response.json();
        return data.rates;
      }
    } catch (error: any) {
      this.logger.warn(`Primary FX API failed: ${error.message}`);
    }

    // Try backup (exchangeratesapi)
    try {
      const apiKey = this.configService.get<string>('EXCHANGE_RATES_API_KEY');
      if (apiKey) {
        const response = await fetch(
          `${this.BACKUP_API}/latest?access_key=${apiKey}&base=${this.BASE_CURRENCY}`,
        );
        if (response.ok) {
          const data = await response.json();
          return data.rates;
        }
      }
    } catch (error: any) {
      this.logger.warn(`Backup FX API failed: ${error.message}`);
    }

    return null;
  }

  /**
   * Get current exchange rates (cached)
   */
  async getRates(): Promise<FXRates> {
    const cacheHours = this.configService.get<number>('FX_CACHE_HOURS', 6);
    
    // Check if cache is valid
    if (
      this.cachedRates &&
      Object.keys(this.cachedRates).length > 0 &&
      this.cacheTimestamp &&
      Date.now() - this.cacheTimestamp.getTime() < cacheHours * 60 * 60 * 1000
    ) {
      return this.cachedRates;
    }

    // Try to get from database
    const today = new Date().toISOString().split('T')[0];
    const dbRates = await this.prisma.fXRate.findFirst({
      where: { base: this.BASE_CURRENCY },
      orderBy: { date: 'desc' },
    });

    if (dbRates) {
      this.cachedRates = dbRates.rates as FXRates;
      this.cacheTimestamp = new Date();
      return this.cachedRates;
    }

    // Force refresh if no cached data
    await this.refreshRates();
    return this.cachedRates;
  }

  /**
   * Convert amount from one currency to another
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{ amount: number; rate: number }> {
    if (fromCurrency === toCurrency) {
      return { amount, rate: 1 };
    }

    const rates = await this.getRates();
    
    // Convert to base currency first (EUR), then to target
    let amountInBase = amount;
    
    if (fromCurrency !== this.BASE_CURRENCY) {
      const fromRate = rates[fromCurrency];
      if (!fromRate) {
        throw new Error(`Unsupported currency: ${fromCurrency}`);
      }
      amountInBase = amount / fromRate;
    }

    let finalAmount = amountInBase;
    let rate = 1;

    if (toCurrency !== this.BASE_CURRENCY) {
      const toRate = rates[toCurrency];
      if (!toRate) {
        throw new Error(`Unsupported currency: ${toCurrency}`);
      }
      finalAmount = amountInBase * toRate;
      rate = toRate;
    }

    return {
      amount: Math.round(finalAmount * 100) / 100,
      rate: Math.round(rate * 10000) / 10000,
    };
  }

  /**
   * Convert amount in minor units (cents) preserving precision
   */
  async convertMinor(
    amountMinor: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{ amountMinor: number; rate: number }> {
    const result = await this.convert(amountMinor / 100, fromCurrency, toCurrency);
    return {
      amountMinor: Math.round(result.amount * 100),
      rate: result.rate,
    };
  }

  /**
   * Get rate for a specific currency pair
   */
  async getRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const rates = await this.getRates();
    
    if (fromCurrency === this.BASE_CURRENCY) {
      return rates[toCurrency] || 0;
    }
    
    if (toCurrency === this.BASE_CURRENCY) {
      return 1 / (rates[fromCurrency] || 1);
    }

    // Cross rate
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    
    if (!fromRate || !toRate) {
      throw new Error(`Cannot calculate rate for ${fromCurrency}/${toCurrency}`);
    }

    return toRate / fromRate;
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    const rates = await this.getRates();
    return [this.BASE_CURRENCY, ...Object.keys(rates)];
  }

  /**
   * Get historical rates for a date range
   */
  async getHistoricalRates(startDate: string, endDate: string) {
    const rates = await this.prisma.fXRate.findMany({
      where: {
        base: this.BASE_CURRENCY,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    return rates.map((r) => ({
      date: r.date,
      rates: r.rates,
    }));
  }
}
