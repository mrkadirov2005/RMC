const { generateToken } = require('../../../middleware/auth');
const ownerService = require('../services/owner.service');
import type { Request, Response } from 'express';
import type {
  CreateOwnerDto,
  RegisterOwnerDto,
  UpdateOwnerDto,
  LoginOwnerDto,
  ChangeOwnerPasswordDto,
} from '../dtos/owner.dto';
const {
  createOwnerDtoSchema,
  registerOwnerDtoSchema,
  updateOwnerDtoSchema,
  loginOwnerDtoSchema,
  changeOwnerPasswordDtoSchema,
  parseValidationError,
} = require('../dtos/owner.dto');

type IdParams = { id: string };

const DEVELOPMENT_OWNER_INVITE_KEY = 'owner-create-2026';
const resolveOwnerInviteKey = (
  environment = process.env.NODE_ENV,
  configuredKey = process.env.OWNER_INVITE_KEY
) => {
  const configured = String(configuredKey || '').trim();
  if (configured) return configured;
  if (environment === 'production') return null;
  return DEVELOPMENT_OWNER_INVITE_KEY;
};

const getAllOwners = async (_req: Request, res: Response) => {
  try {
    res.json(await ownerService.listOwners());
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Egalarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getOwnerById = async (req: Request<IdParams>, res: Response) => {
  try {
    const row = await ownerService.getOwner(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Ega topilmadi' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Egani yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const createOwner = async (req: Request<unknown, unknown, CreateOwnerDto>, res: Response) => {
  try {
    const validation = createOwnerDtoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Kiritilgan ma'lumotlar noto'g'ri", details: parseValidationError(validation.error) });
    }
    const out = await ownerService.createOwner(validation.data);
    if (out.error === 'username_taken') {
      return res.status(400).json({ error: 'Bu foydalanuvchi nomi allaqachon mavjud' });
    }
    res.status(201).json((out as any).row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Egani yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const register = async (req: Request<unknown, unknown, RegisterOwnerDto>, res: Response) => {
  try {
    const validation = registerOwnerDtoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Kiritilgan ma'lumotlar noto'g'ri", details: parseValidationError(validation.error) });
    }

    const expectedKey = resolveOwnerInviteKey();
    // if (!expectedKey) {
    //   return res.status(500).json({ error: 'Owner registration is not configured.' });
    // }
    // TODO Warning: this block above is temporarily disabled with this comment and needs to be re-enabled after setup
    // if (String(validation.data.invite_key || '').trim() !== expectedKey) {
    //   return res.status(403).json({ error: 'Invalid keyword' });
    // }

    const out = await ownerService.registerOwner(validation.data);
    if (out.error === 'username_taken') {
      return res.status(400).json({ error: 'Bu foydalanuvchi nomi allaqachon mavjud' });
    }

    const owner = (out as any).row;
    const token = generateToken({
      id: owner.owner_id,
      username: owner.username,
      email: owner.email,
      userType: 'superuser',
      role: 'owner',
      can_hard_delete: false,
    });

    res.status(201).json({
      message: 'Owner account created successfully',
      token,
      owner: {
        owner_id: owner.owner_id,
        username: owner.username,
        email: owner.email,
        first_name: owner.first_name,
        last_name: owner.last_name,
        role: 'owner',
        status: owner.status,
        can_hard_delete: false,
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Egani yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateOwner = async (req: Request<IdParams, unknown, UpdateOwnerDto>, res: Response) => {
  try {
    const validation = updateOwnerDtoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Kiritilgan ma'lumotlar noto'g'ri", details: parseValidationError(validation.error) });
    }
    const row = await ownerService.updateOwner(Number(req.params.id), validation.data);
    if (!row) return res.status(404).json({ error: 'Ega topilmadi' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Egani yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteOwner = async (req: Request<IdParams>, res: Response) => {
  try {
    const row = await ownerService.deleteOwner(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Ega topilmadi' });
    res.json({ message: "Ega muvaffaqiyatli o'chirildi", owner: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Egani o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const login = async (req: Request<unknown, unknown, LoginOwnerDto>, res: Response) => {
  try {
    const validation = loginOwnerDtoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Kiritilgan ma'lumotlar noto'g'ri", details: parseValidationError(validation.error) });
    }
    const { username, password } = validation.data;
    const result = await ownerService.authenticate(username, password);
    if (result.kind === 'locked') {
      return res.status(403).json({ error: 'Account is locked' });
    }
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: 'Account is not active' });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: "Foydalanuvchi nomi yoki parol noto'g'ri" });
    }
    const { owner } = result;
    const token = generateToken({
      id: owner.owner_id,
      username: owner.username,
      email: owner.email,
      userType: 'superuser',
      role: 'owner',
      can_hard_delete: Boolean(owner.can_hard_delete),
    });
    res.json({
      message: 'Tizimga muvaffaqiyatli kirildi',
      token,
      owner: {
        owner_id: owner.owner_id,
        username: owner.username,
        email: owner.email,
        first_name: owner.first_name,
        last_name: owner.last_name,
        role: 'owner',
        status: owner.status,
        can_hard_delete: Boolean(owner.can_hard_delete),
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Tizimga kirib bo'lmadi", details: error.message || String(error) });
  }
};

const changePassword = async (req: Request<IdParams, unknown, ChangeOwnerPasswordDto>, res: Response) => {
  try {
    const validation = changeOwnerPasswordDtoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Kiritilgan ma'lumotlar noto'g'ri", details: parseValidationError(validation.error) });
    }
    const { old_password, new_password } = validation.data;
    const out = await ownerService.changePassword(Number(req.params.id), old_password, new_password);
    if (!out.ok) {
      if (out.reason === 'not_found') return res.status(404).json({ error: 'Ega topilmadi' });
      return res.status(401).json({ error: "Joriy parol noto'g'ri" });
    }
    res.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Parolni o'zgartirib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getAllOwners,
  getOwnerById,
  createOwner,
  updateOwner,
  deleteOwner,
  login,
  register,
  changePassword,
};

export {};
