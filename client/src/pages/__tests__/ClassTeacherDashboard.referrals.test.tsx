import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as qc from "@/lib/queryClient";
import * as auth from "@/lib/auth";
import ClassTeacherDashboard from "@/pages/ClassTeacherDashboard";
import { vi, describe, it, beforeEach, afterEach, expect } from "vitest";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("ClassTeacherDashboard referrals UI", () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  beforeEach(() => {
    // Mock auth to return a ClassTeacher user
    vi.spyOn(auth, "useAuth").mockReturnValue({ user: { id: 't1', role: 'ClassTeacher', classSection: '1-A' }, token: null, isLoading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), hasRole: () => true } as any);

    // Seed referral-tracking query data
    const key = ["/api/teacher/referral-tracking", String(new Date().getMonth() + 1), String(new Date().getFullYear()), "all", "all", { class_id: '1-A' }];
    queryClient.setQueryData(key, {
      referrals: [
        { id: 'r1', studentName: 'John Doe', type: 'deficiency', facility: 'PHC', date: '2025-12-10', status: 'Pending', followUpRequired: true },
      ],
      summary: { pending: 1, inProgress: 0, completed: 0, overdue: 0 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  it("renders status select and calls API on change", async () => {
    const apiSpy = vi.spyOn(qc, "apiRequest").mockResolvedValue({ json: async () => ({ id: 'r1', status: 'In Progress' }) } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ClassTeacherDashboard />
      </QueryClientProvider>
    );

    // Find the select trigger (it has data-testid set)
    const trigger = await screen.findByTestId("referral-status-r1");
    expect(trigger).toBeInTheDocument();

    // Open the select and choose 'In Progress'
    await userEvent.click(trigger);
    const option = await screen.findByText("In Progress");
    await userEvent.click(option);

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalled();
      const callArgs = apiSpy.mock.calls[0];
      expect(callArgs[0]).toBe("PATCH");
      expect(callArgs[1]).toContain(`/api/referrals/r1`);
    });
  });
});