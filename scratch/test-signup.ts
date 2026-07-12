import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth/password";
import { withEmployeeCode } from "../lib/employee-code";

async function test() {
  const email = `test-${Date.now()}@example.com`;
  const password = "password123";
  const firstName = "Test";
  const lastName = "User";

  console.log("Checking unique email...");
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  console.log("Existing user check:", existingUser);

  console.log("Hashing password...");
  const passwordHash = await hashPassword(password);

  console.log("Creating user and employee within transaction...");
  try {
    const result = await withEmployeeCode((employeeCode) =>
      prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            role: "EMPLOYEE",
            status: "ACTIVE",
            emailVerifiedAt: new Date(),
          },
        });

        const newEmployee = await tx.employee.create({
          data: {
            userId: newUser.id,
            employeeCode,
            firstName,
            lastName,
            phone: null,
            designation: null,
            departmentId: null,
          },
        });

        return { user: newUser, employee: newEmployee };
      })
    );
    console.log("Transaction success! Result:", result);
  } catch (e) {
    console.error("Transaction failed with error:", e);
  }

  // Close prisma
  await prisma.$disconnect();
}

test().catch(console.error);
