import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { updateOrderPaymentState } from "@/lib/server-db";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const session = await getServerSession();

  if (session?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    paymentStatus?: string;
    status?: string;
  };

  try {
    const result = await updateOrderPaymentState(
      id,
      {
        paymentStatus: body.paymentStatus,
        status: body.status
      },
      session.email
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to update order." },
      { status: 400 }
    );
  }
}

