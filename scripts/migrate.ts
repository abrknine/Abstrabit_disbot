import { getRepository } from "../src/services/storage/interaction-repository";
import { seedAdminUser } from "../src/services/storage/user-repository";

await getRepository().init();
await seedAdminUser();
console.log("migrations applied and admin seeded");
process.exit(0);
