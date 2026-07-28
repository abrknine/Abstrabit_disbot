declare global {
  namespace Express {
    interface Request {
      admin?: { email: string };
      rawBody?: Buffer;
    }
  }
}

export {};
