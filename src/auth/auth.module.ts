import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfig } from '../config/config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PondRolesGuard } from './pond-roles.guard';
import { AdminUserGuard } from './admin-user.guard';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        secret: config.jwt.accessSecret,
        signOptions: { expiresIn: config.jwt.accessTtlSeconds },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, PondRolesGuard, AdminUserGuard],
  exports: [AuthService, JwtAuthGuard, PondRolesGuard, AdminUserGuard, JwtModule],
})
export class AuthModule {}
