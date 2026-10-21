jest.mock('../../repositories/smsTemplates.repository', () => ({
  findAll: jest.fn(async () => []),
  findActiveBodies: jest.fn(async () => ({})),
  create: jest.fn(async (row) => ({ template_id: 1, is_active: false, ...row })),
  update: jest.fn(async (id, row) => ({ template_id: id, ...row })),
  remove: jest.fn(async () => true),
  setActive: jest.fn(async (id, active) => ({ template_id: id, is_active: active })),
}));

const repository = require('../../repositories/smsTemplates.repository');
const templates = require('../smsTemplates.service');

describe('sms templates', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fills placeholders and leaves an unknown value empty', () => {
    expect(templates.renderTemplate('{ism}: {qoldiq}{yoq}', { ism: 'Ali', qoldiq: "5 so'm" })).toBe("Ali: 5 so'm");
  });

  it('accepts only the placeholders of its type and says which are wrong', () => {
    expect(templates.validateTemplate('attendance', ' Qisqa ', ' {ism} {soni} ta dars ')).toEqual({ kind: 'attendance', name: 'Qisqa', body: '{ism} {soni} ta dars' });
    expect(() => templates.validateTemplate('attendance', 'X', '{ism} {qoldiq} {summa}')).toThrow('{qoldiq}, {summa}');
    expect(() => templates.validateTemplate('test', 'X', 'Y')).toThrow("turi noto'g'ri");
    expect(() => templates.validateTemplate('payment_waiting', '', 'Y')).toThrow('nomini');
    expect(() => templates.validateTemplate('payment_waiting', 'X', '  ')).toThrow('matnini');
    expect(() => templates.validateTemplate('payment_waiting', 'X', 'a'.repeat(1001))).toThrow('1000');
  });

  it("every type's example only uses its own placeholders", () => {
    for (const kind of templates.TEMPLATE_KINDS) {
      expect(() => templates.validateTemplate(kind, 'Namuna', templates.EXAMPLES[kind])).not.toThrow();
    }
  });

  it('lists templates with what each type can use', async () => {
    const out = await templates.listTemplates();
    expect(out.kinds.map((kind) => kind.kind)).toEqual(['payment_success', 'payment_waiting', 'attendance']);
    expect(out.kinds[2].placeholders).toContain('sanalar');
  });

  it('keeps the type of an existing template when it is edited, and 404s a missing one', async () => {
    repository.findAll.mockResolvedValueOnce([{ template_id: 5, kind: 'attendance' }]);
    await templates.updateTemplate(5, { name: 'Yangi', body: '{ism} {sanalar}', kind: 'payment_waiting' });
    expect(repository.update).toHaveBeenCalledWith(5, { name: 'Yangi', body: '{ism} {sanalar}' });

    repository.findAll.mockResolvedValueOnce([]);
    await expect(templates.updateTemplate(9, { name: 'X', body: 'Y' })).rejects.toMatchObject({ statusCode: 404 });
    repository.remove.mockResolvedValueOnce(false);
    await expect(templates.deleteTemplate(9)).rejects.toMatchObject({ statusCode: 404 });
    repository.setActive.mockResolvedValueOnce(null);
    await expect(templates.setTemplateActive(9, true)).rejects.toMatchObject({ statusCode: 404 });
  });
});
