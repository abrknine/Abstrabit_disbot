import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { getUserRepository, type AdminUser } from "../storage/user-repository";

export const verifyCredentials = async (
  email: string,
  password: string
): Promise<AdminUser | null> => {
  const user = await getUserRepository().findByEmail(email);
  if (!user) {
    // Burn comparable time so a missing email is indistinguishable from a wrong password.
    await bcrypt.compare(password, "$2a$10$invalidsaltinvalidsaltinvalidsaltinvalid12");
    return null;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
};

export const issueToken = (user: AdminUser): string =>
  jwt.sign({ sub: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: "12h" });

export const verifyToken = (token: string): { sub: string } =>
  jwt.verify(token, env.JWT_SECRET) as { sub: string };
