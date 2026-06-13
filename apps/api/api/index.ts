import 'reflect-metadata';
import express, { type Express, type Request, type Response } from 'express';
import { createApp } from '../src/create-app';

/**
 * Vercel serverless entry point. The Nest app is built once per cold start and
 * the configured Express instance is cached, so warm invocations reuse the same
 * app (and its Prisma connection). vercel.json rewrites every route here.
 */
let cached: Express | null = null;

async function getServer(): Promise<Express> {
  if (cached) return cached;
  const server = express();
  const { app } = await createApp(server);
  await app.init();
  cached = server;
  return server;
}

export default async function handler(req: Request, res: Response) {
  const server = await getServer();
  server(req, res);
}
