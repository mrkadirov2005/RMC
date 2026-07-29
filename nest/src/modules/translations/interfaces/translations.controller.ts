import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Public } from '../../../common/public.decorator';
import { TranslationsService } from '../application/translations.service';

@Controller('translations')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Public()
  @Get()
  list() {
    return this.translationsService.listTranslations();
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.translationsService.getTranslation(id);
  }

  @Post('bulk')
  saveBulk(@Body() body: any) {
    const rows = Array.isArray(body?.translations) ? body.translations : [];
    return this.translationsService.saveTranslations(rows);
  }

  @Put(':id')
  save(@Param('id') id: string, @Body() body: any) {
    return this.translationsService.saveTranslation(id, body || {});
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.translationsService.deleteTranslation(id);
  }
}
