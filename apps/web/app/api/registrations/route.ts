import { NextResponse } from "next/server";
import { createRegistration } from "@/lib/registrations/registration-service";
import { checkRateLimit } from "@/lib/utils/rate-limiter";
import { tournamentConfig } from "@/config/tournament";

const MAX_PAYLOAD_BYTES = 32 * 1024; // 32 KB limit

export async function POST(request: Request) {
  try {
    // Check if registration is officially open
    if (!tournamentConfig.registrationOpen) {
      return NextResponse.json(
        {
          success: false,
          error: "Registration is officially closed. New team registrations are no longer accepted.",
        },
        { status: 400 }
      );
    }
    // 1. IP Rate Limiting: 10 registration submissions per 10 minutes per IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : request.headers.get("x-real-ip") || "127.0.0.1";

    const rateLimit = await checkRateLimit(`reg:${ip}`, 10, 600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many registration attempts. Please wait a few minutes and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "600",
          },
        }
      );
    }

    // 2. Payload size check
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Request payload exceeds the maximum allowed size (32 KB).",
        },
        { status: 413 }
      );
    }

    const rawText = await request.text();
    if (rawText.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Request payload exceeds the maximum allowed size.",
        },
        { status: 413 }
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON format.",
        },
        { status: 400 }
      );
    }

    const result = await createRegistration(body);

    if (!result.success) {
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
