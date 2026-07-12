import { BookingRepository } from "@/modules/booking/repositories/booking.repository";
import { MaintenanceRequestRepository } from "@/modules/maintenance/repositories/maintenance-request.repository";
import { requireSessionUser } from "@/shared/auth/session";
import { prisma } from "@/shared/database";

export async function getEmployeeDashboard() {
  const user = await requireSessionUser();

  const [allocations, bookings, maintenanceRequests, transferRequests] = await Promise.all([
    prisma.allocation.findMany({
      where: { holderEmployeeId: user.id, status: "ACTIVE" },
      orderBy: { allocatedAt: "desc" },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            location: true,
            status: true,
          },
        },
      },
    }),
    new BookingRepository().findByBooker(user.id, 10),
    new MaintenanceRequestRepository().findByRaisedBy(user.id),
    prisma.transferRequest.findMany({
      where: { fromEmployeeId: user.id },
      orderBy: { requestedAt: "desc" },
      take: 10,
      include: {
        allocation: {
          include: {
            asset: { select: { assetTag: true, name: true } },
          },
        },
        toEmployee: { select: { name: true, email: true } },
      },
    }),
  ]);

  return { allocations, bookings, maintenanceRequests, transferRequests };
}
