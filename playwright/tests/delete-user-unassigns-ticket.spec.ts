import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { signInAsAdmin } from "../helpers/auth";
import { sendInboundEmail } from "../helpers/inbound-email";
import { ensureCredentialUser } from "../helpers/users";

test("e2e: deleting an assigned user leaves the ticket unassigned", async ({
  page,
  request,
}) => {
  const id = randomUUID().slice(0, 8);
  const agent = {
    email: `ticket.owner.${id}@example.com`,
    name: `Ticket Owner ${id}`,
    password: "qwerdf66",
  };

  await ensureCredentialUser({
    email: agent.email,
    password: agent.password,
    name: agent.name,
    role: "agent",
  });

  const created = await sendInboundEmail(request, {
    messageId: `delete-user-unassign-${id}`,
    from: {
      email: `delete.user.flow.${id}@example.com`,
      name: `Delete User Flow ${id}`,
    },
    subject: `Delete user should unassign ${id}`,
    text: `Please verify assignment cleanup for ${id}.`,
    category: "general",
  });

  expect(created.status()).toBe(201);

  const body = await created.json();
  const ticketId = body.ticketId as number;

  await signInAsAdmin(page);

  await page.goto(`/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: `Delete user should unassign ${id}` })).toBeVisible();

  await page.getByRole("combobox", { name: "指派给" }).click();
  await page.getByRole("option", { name: agent.name }).click();
  await expect(page.getByRole("combobox", { name: "指派给" })).toHaveText(agent.name);

  await page.goto("/users");
  await expect(page.getByRole("button", { name: `删除用户 ${agent.name}` })).toBeVisible();
  await page.getByRole("button", { name: `删除用户 ${agent.name}` }).click();
  await expect(page.getByRole("heading", { name: "确认删除用户" })).toBeVisible();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByRole("heading", { name: "确认删除用户" })).toHaveCount(0);
  await expect(page.getByText(agent.name)).toHaveCount(0);

  await page.goto(`/tickets/${ticketId}`);
  await expect(page.getByRole("heading", { name: `Delete user should unassign ${id}` })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "指派给" })).toHaveText("未指派");
});
