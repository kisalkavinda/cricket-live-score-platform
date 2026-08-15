import { RegistrationFormData } from "../validations/registration";

export interface SubmitRegistrationResponse {
  success: boolean;
  registrationId?: string;
  registrationCode?: string;
  teamName?: string;
  playerCount?: number;
  error?: string;
  details?: Record<string, string[]>;
}

/**
 * Submits team registration payload to the server API.
 */
export async function submitRegistration(
  data: RegistrationFormData
): Promise<SubmitRegistrationResponse> {
  try {
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return result;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Network error occurred";
    return {
      success: false,
      error: `Unable to connect to the registration server: ${message}. Check your internet connection and try again.`,
    };
  }
}
