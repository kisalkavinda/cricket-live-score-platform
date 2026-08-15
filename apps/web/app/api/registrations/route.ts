import { NextResponse } from "next/server";
import { createRegistration } from "@/lib/registrations/registration-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createRegistration(body);

    if (!result.success) {
      console.warn("[API /api/registrations 400]", result.error, result.details);
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("[API /api/registrations] Unhandled error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected server error occurred. Please check your network connection and try again.",
      },
      { status: 500 }
    );
  }
}
