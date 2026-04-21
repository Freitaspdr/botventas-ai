import { Request, Response, Router } from 'express';
import {
  getEmpresaByCrmToken,
  getEmpresaById,
} from '../services/conversation.service';
import {
  getContactoDetalle,
  getConversacionCrmDetalle,
  listContactos,
  listConversacionesCrm,
  listLeadsCrm,
  sendHumanMessage,
  updateConversacionEstado,
} from '../services/crm.service';
import { env } from '../config/env';

export const crmRouter = Router();

function isLocalRequest(req: Request): boolean {
  const ip = req.ip ?? req.socket.remoteAddress ?? '';
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);
}

function hasInternalSecret(req: Request): boolean {
  return !!env.WEBHOOK_SECRET && req.header('x-botventas-secret') === env.WEBHOOK_SECRET;
}

async function resolveEmpresaId(req: Request): Promise<string | null> {
  const crmToken = req.header('x-crm-token');
  if (crmToken) {
    const empresa = await getEmpresaByCrmToken(crmToken);
    return empresa?.id ?? null;
  }

  if (!isLocalRequest(req) && !hasInternalSecret(req)) {
    return null;
  }

  const byHeader = req.header('x-empresa-id');
  const byQuery = typeof req.query.empresaId === 'string' ? req.query.empresaId : null;
  const empresaId = byHeader || byQuery;
  if (!empresaId) return null;

  const empresa = await getEmpresaById(empresaId);
  return empresa?.id ?? null;
}

function unauthorized(res: Response): void {
  res.status(401).json({ ok: false, error: 'Unauthorized' });
}

crmRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'crm', timestamp: new Date().toISOString() });
});

crmRouter.get('/contactos', async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  if (!empresaId) {
    unauthorized(res);
    return;
  }

  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    const limit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;
    const data = await listContactos(empresaId, { q, estado, limit });
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? 'Error interno' });
  }
});

crmRouter.get('/contactos/:id', async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  if (!empresaId) {
    unauthorized(res);
    return;
  }

  try {
    const data = await getContactoDetalle(empresaId, req.params.id);
    if (!data) {
      res.status(404).json({ ok: false, error: 'Not found' });
      return;
    }

    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? 'Error interno' });
  }
});

crmRouter.get('/conversaciones', async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  if (!empresaId) {
    unauthorized(res);
    return;
  }

  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    const limit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;
    const data = await listConversacionesCrm(empresaId, { q, estado, limit });
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? 'Error interno' });
  }
});

crmRouter.get('/conversaciones/:id', async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  if (!empresaId) {
    unauthorized(res);
    return;
  }

  try {
    const data = await getConversacionCrmDetalle(empresaId, req.params.id);
    if (!data) {
      res.status(404).json({ ok: false, error: 'Not found' });
      return;
    }

    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? 'Error interno' });
  }
});

crmRouter.patch('/conversaciones/:id', async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  if (!empresaId) {
    unauthorized(res);
    return;
  }

  const estado = req.body?.estado;
  if (!['activa', 'cerrada', 'transferida'].includes(estado)) {
    res.status(400).json({ ok: false, error: 'Estado inválido' });
    return;
  }

  try {
    const data = await updateConversacionEstado(empresaId, req.params.id, estado);
    if (!data) {
      res.status(404).json({ ok: false, error: 'Not found' });
      return;
    }

    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? 'Error interno' });
  }
});

crmRouter.post('/conversaciones/:id/messages', async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  if (!empresaId) {
    unauthorized(res);
    return;
  }

  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  if (!text.trim()) {
    res.status(400).json({ ok: false, error: 'Mensaje vacío' });
    return;
  }

  try {
    const data = await sendHumanMessage(empresaId, req.params.id, text);
    res.json({ ok: true, data });
  } catch (err: any) {
    const message = err?.message ?? 'Error interno';
    const status = message === 'Conversación no encontrada' ? 404 : 500;
    res.status(status).json({ ok: false, error: message });
  }
});

crmRouter.get('/leads', async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  if (!empresaId) {
    unauthorized(res);
    return;
  }

  try {
    const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    const nivel = typeof req.query.nivel === 'string' ? req.query.nivel : undefined;
    const limit = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;
    const data = await listLeadsCrm(empresaId, { estado, nivel, limit });
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? 'Error interno' });
  }
});
