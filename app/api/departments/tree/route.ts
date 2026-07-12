import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '@/lib/auth/rbac';

interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  parentDepartmentId: string | null;
  headEmployeeId: string | null;
  headEmployee?: any;
  childDepartments: DepartmentNode[];
}

export async function GET() {
  const auth = await checkAuth(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']);
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    // Fetch all active, non-deleted departments
    const departments = await prisma.department.findMany({
      where: {
        isDeleted: false,
        status: 'ACTIVE',
      },
      include: {
        headEmployee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    // Create map for O(1) lookups
    const deptMap = new Map<string, DepartmentNode>();
    
    departments.forEach((dept) => {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        status: dept.status,
        parentDepartmentId: dept.parentDepartmentId,
        headEmployeeId: dept.headEmployeeId,
        headEmployee: dept.headEmployee,
        childDepartments: [],
      });
    });

    const rootDepartments: DepartmentNode[] = [];

    // Build the tree hierarchy
    deptMap.forEach((node) => {
      if (node.parentDepartmentId && deptMap.has(node.parentDepartmentId)) {
        const parentNode = deptMap.get(node.parentDepartmentId)!;
        parentNode.childDepartments.push(node);
      } else {
        // If no parent or parent is inactive/deleted (not in the map), treat as root node
        rootDepartments.push(node);
      }
    });

    return NextResponse.json({ success: true, tree: rootDepartments });
  } catch (error: any) {
    console.error('GET /api/departments/tree error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build department tree' },
      { status: 500 }
    );
  }
}
