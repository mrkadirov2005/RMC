import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { translations } from '../../../database/schema';

type TranslationInput = { id?: string; english?: string; uzbek?: string };

@Injectable()
export class TranslationsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async listTranslations() {
    return this.db.select().from(translations).orderBy(translations.id);
  }

  async getTranslation(id: string) {
    const rows = await this.db.select().from(translations).where(eq(translations.id, id)).limit(1);
    if (!rows[0]) throw new NotFoundException('Translation not found');
    return rows[0];
  }

  saveTranslation(id: string, data: TranslationInput) {
    const row = this.normalizeInput(data, id);
    return this.upsert(row.id, row.english, row.uzbek);
  }

  async saveTranslations(rows: TranslationInput[]) {
    return this.db.transaction(async (tx: any) => {
      const saved: any[] = [];
      for (const input of rows.map((row) => this.normalizeInput(row))) {
        const result = await tx
          .insert(translations)
          .values(input)
          .onConflictDoUpdate({
            target: translations.id,
            set: { english: input.english, uzbek: input.uzbek },
          })
          .returning();
        saved.push(result[0]);
      }
      return saved;
    });
  }

  async deleteTranslation(id: string) {
    const rows = await this.db.delete(translations).where(eq(translations.id, id)).returning();
    if (!rows[0]) throw new NotFoundException('Translation not found');
    return { message: 'Translation deleted successfully' };
  }

  private normalizeInput(input: TranslationInput, fallbackId?: string) {
    const id = this.normalizeText(input.id || fallbackId);
    if (!id) throw new BadRequestException('Translation id is required');
    return {
      id,
      english: this.normalizeText(input.english),
      uzbek: this.normalizeText(input.uzbek),
    };
  }

  private normalizeText(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private async upsert(id: string, english: string, uzbek: string) {
    const rows = await this.db
      .insert(translations)
      .values({ id, english, uzbek })
      .onConflictDoUpdate({
        target: translations.id,
        set: { english, uzbek },
      })
      .returning();
    return rows[0];
  }
}
