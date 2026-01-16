import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

// ==================== Registration DTOs ====================

export class PasskeyRegistrationStartDto {
  @ApiPropertyOptional({
    description: 'Name for this device/passkey',
    example: 'iPhone 15 Pro',
  })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class PasskeyRegistrationFinishDto {
  @ApiProperty({
    description: 'WebAuthn registration response from authenticator',
    example: {
      id: 'base64url-encoded-credential-id',
      rawId: 'base64url-encoded-raw-id',
      response: {
        attestationObject: 'base64url-encoded-attestation-object',
        clientDataJSON: 'base64url-encoded-client-data',
      },
      type: 'public-key',
    },
  })
  @IsObject()
  @IsNotEmpty()
  response: {
    id: string;
    rawId: string;
    response: {
      attestationObject: string;
      clientDataJSON: string;
      transports?: string[];
    };
    type: string;
    clientExtensionResults?: Record<string, unknown>;
    authenticatorAttachment?: string;
  };
}

// ==================== Authentication DTOs ====================

export class PasskeyLoginStartDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

export class PasskeyLoginFinishDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'WebAuthn authentication response from authenticator',
    example: {
      id: 'base64url-encoded-credential-id',
      rawId: 'base64url-encoded-raw-id',
      response: {
        authenticatorData: 'base64url-encoded-authenticator-data',
        clientDataJSON: 'base64url-encoded-client-data',
        signature: 'base64url-encoded-signature',
        userHandle: 'base64url-encoded-user-handle',
      },
      type: 'public-key',
    },
  })
  @IsObject()
  @IsNotEmpty()
  response: {
    id: string;
    rawId: string;
    response: {
      authenticatorData: string;
      clientDataJSON: string;
      signature: string;
      userHandle?: string;
    };
    type: string;
    clientExtensionResults?: Record<string, unknown>;
    authenticatorAttachment?: string;
  };
}
