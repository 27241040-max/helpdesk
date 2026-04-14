import { UserRole } from "core/users";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { describe, expect, test, vi } from "vitest";

import { Layout } from "./Layout";

vi.mock("../lib/auth-client", () => ({
  authClient: {
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
}));

function renderLayout(isAdmin: boolean) {
  return render(
    <MemoryRouter initialEntries={["/tickets"]}>
      <Routes>
        <Route element={<Layout displayName="Tester" isAdmin={isAdmin} />} path="/">
          <Route element={<div>content</div>} path="tickets" />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout", () => {
  test("shows the tickets navigation link for logged-in users", () => {
    renderLayout(false);

    expect(screen.getByRole("link", { name: "工单" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "用户" })).not.toBeInTheDocument();
  });

  test("shows both tickets and users links for admins", () => {
    renderLayout(UserRole.admin === UserRole.admin);

    expect(screen.getByRole("link", { name: "工单" })).toBeVisible();
    expect(screen.getByRole("link", { name: "用户" })).toBeVisible();
  });
});
