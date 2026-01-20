import { NestFactory } from '@nestjs/core';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:8080',
      'https://jamia.app',
      'https://www.jamia.app',
    ],
    credentials: true,
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        // Optionally, format the errors to make them more readable or to return a custom error response
        const formattedErrors: Record<string, string> = {};
        errors.forEach((error) => {
          // Assuming you only want the first error message per property for simplicity
          const firstConstraintKey = Object.keys(error?.constraints || {})[0];
          const firstErrorMessage = error.constraints
            ? error.constraints[firstConstraintKey]
            : '';
          formattedErrors[error.property] = firstErrorMessage;
        });
        return new BadRequestException(formattedErrors);
      },
    }),
  );

  await app.listen(process.env.PORT ?? 8088);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
