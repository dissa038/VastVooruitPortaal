/**
 * Microsoft Graph API v1.0 Client
 *
 * Handles authentication and API calls for Outlook Calendar & Email.
 * Uses OAuth 2.0 with delegated permissions.
 *
 * Required environment variables:
 * - AZURE_CLIENT_ID: Azure AD app client ID
 * - AZURE_CLIENT_SECRET: Azure AD app client secret
 * - AZURE_TENANT_ID: Azure AD tenant ID
 *
 * Docs: https://learn.microsoft.com/en-us/graph/overview
 */

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

export interface OutlookTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function getAccessToken(refreshToken: string): Promise<OutlookTokens> {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/.default offline_access",
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export function getGraphClient(accessToken: string) {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${GRAPH_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Graph API error ${res.status}: ${error}`);
    }

    return res.json();
  }

  return {
    // Calendar Events
    calendar: {
      listEvents: (
        userId: string,
        calendarId: string,
        startDateTime: string,
        endDateTime: string
      ) =>
        request<GraphEventList>(
          `/users/${userId}/calendars/${calendarId}/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$top=100`
        ),
      createEvent: (userId: string, calendarId: string, event: Partial<GraphEvent>) =>
        request<GraphEvent>(
          `/users/${userId}/calendars/${calendarId}/events`,
          {
            method: "POST",
            body: JSON.stringify(event),
          }
        ),
      updateEvent: (
        userId: string,
        calendarId: string,
        eventId: string,
        event: Partial<GraphEvent>
      ) =>
        request<GraphEvent>(
          `/users/${userId}/calendars/${calendarId}/events/${eventId}`,
          {
            method: "PATCH",
            body: JSON.stringify(event),
          }
        ),
      deleteEvent: (userId: string, calendarId: string, eventId: string) =>
        request(
          `/users/${userId}/calendars/${calendarId}/events/${eventId}`,
          { method: "DELETE" }
        ),
    },
    // Mail (for sending appointment confirmations from adviseur email)
    mail: {
      sendMail: (
        userId: string,
        message: {
          subject: string;
          body: { contentType: "HTML" | "Text"; content: string };
          toRecipients: { emailAddress: { address: string } }[];
          ccRecipients?: { emailAddress: { address: string } }[];
        }
      ) =>
        request(`/users/${userId}/sendMail`, {
          method: "POST",
          body: JSON.stringify({ message, saveToSentItems: true }),
        }),
    },
  };
}

// Types
export interface GraphEvent {
  id: string;
  subject: string;
  body: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location: { displayName: string; address?: { street: string; city: string; postalCode: string } };
  attendees: { emailAddress: { address: string; name: string }; type: string }[];
  isAllDay: boolean;
}

export interface GraphEventList {
  value: GraphEvent[];
  "@odata.nextLink"?: string;
}
