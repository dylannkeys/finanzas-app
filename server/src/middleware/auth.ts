import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "../errors.js";

export interface AuthPayload {
  userId: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function signToken(userId: number, secret: string): string {
  return jwt.sign({ userId } satisfies AuthPayload, secret, { expiresIn: "7d" });
}

export function requireAuth(secret: string): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) throw new HttpError(401, "Debes iniciar sesión.");
    try {
      const payload = jwt.verify(token, secret) as AuthPayload;
      req.userId = payload.userId;
      next();
    } catch {
      throw new HttpError(401, "La sesión no es válida o ha expirado.");
    }
  };
}

/** Devuelve el id del usuario autenticado (solo usar tras requireAuth). */
export function currentUser(req: { userId?: number }): number {
  if (!req.userId) throw new HttpError(401, "Debes iniciar sesión.");
  return req.userId;
}
