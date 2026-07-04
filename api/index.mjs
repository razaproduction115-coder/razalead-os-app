import { appHandler } from '../server.mjs';

export default async function handler(req, res) {
  return appHandler(req, res);
}
