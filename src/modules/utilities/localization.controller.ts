import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { LocalizationQueryDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Localization')
@Controller('localization')
export class LocalizationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('strings')
  @Public()
  @ApiOperation({ summary: 'Get localization strings by language' })
  @ApiResponse({ status: 200, description: 'Localization strings' })
  async getStrings(@Query() query: LocalizationQueryDto) {
    const { lang = 'en', namespace = 'ui', version = 1 } = query;

    // Try requested language first
    let strings = await this.prisma.localizationString.findMany({
      where: { lang, namespace, version },
      select: { key: true, value: true },
    });

    // Fallback to English if no strings found
    if (strings.length === 0 && lang !== 'en') {
      strings = await this.prisma.localizationString.findMany({
        where: { lang: 'en', namespace, version },
        select: { key: true, value: true },
      });
    }

    // Convert to key-value object
    const result: Record<string, string> = {};
    for (const s of strings) {
      result[s.key] = s.value;
    }

    return {
      lang: strings.length > 0 ? lang : 'en',
      namespace,
      version,
      strings: result,
    };
  }

  @Get('languages')
  @Public()
  @ApiOperation({ summary: 'Get available languages' })
  async getLanguages() {
    const languages = await this.prisma.localizationString.findMany({
      distinct: ['lang'],
      select: { lang: true },
    });

    const supportedLanguages = [
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'Français' },
      { code: 'es', name: 'Español' },
      { code: 'de', name: 'Deutsch' },
      { code: 'ar', name: 'العربية' },
      { code: 'zh', name: '中文' },
    ];

    return {
      available: languages.map((l) => l.lang),
      supported: supportedLanguages,
    };
  }
}
