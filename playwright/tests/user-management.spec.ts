import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import {
  expectHomePage,
  expectUsersPage,
  fillLoginForm,
  openLoginPage,
  openUsersPage,
  signIn,
  signInAsAdmin,
  signOut,
  submitLoginForm,
} from "../helpers/auth";
import { ensureCredentialUser } from "../helpers/users";

function makeUser(prefix: string) {
  const id = randomUUID().slice(0, 8);

  return {
    email: `${prefix}.${id}@example.com`,
    name: `${prefix} ${id}`,
    password: "qwerdf66",
  };
}

async function openUsersAsAdmin(page: Page) {
  await signInAsAdmin(page);
  await openUsersPage(page);
  await expectUsersPage(page);
}

test("read: admin can open the user list and see an existing user", async ({ page }) => {
  const user = makeUser("reader");

  await ensureCredentialUser({
    email: user.email,
    password: user.password,
    name: user.name,
    role: "agent",
  });

  await openUsersAsAdmin(page);

  await expect(page.getByText(user.name)).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();
  await expect(page.getByRole("button", { name: `编辑用户 ${user.name}` })).toBeVisible();
  await expect(page.getByRole("button", { name: `删除用户 ${user.name}` })).toBeVisible();
});

test("create: admin can create a new user from the users page", async ({ page }) => {
  const user = makeUser("creator");

  await openUsersAsAdmin(page);

  await page.getByRole("button", { name: "创建用户" }).click();
  await page.getByLabel("姓名").fill(user.name);
  await page.getByLabel("电子邮件").fill(user.email);
  await page.getByLabel("密码").fill(user.password);
  await page.getByRole("button", { name: "创建用户" }).click();

  await expect(page.getByRole("heading", { name: "创建新用户" })).toHaveCount(0);
  await expect(page.getByText(user.name)).toBeVisible();
  await expect(page.getByText(user.email)).toBeVisible();

  await signOut(page);
  await openLoginPage(page);
  await fillLoginForm(page, user.email, user.password);
  await submitLoginForm(page);
  await expectHomePage(page);
});

test("update: admin can edit user profile and password", async ({ page }) => {
  const user = makeUser("editor");
  const next = {
    email: user.email.replace("@", ".updated@"),
    name: `${user.name} updated`,
    password: "newpassword123",
  };

  await ensureCredentialUser({
    email: user.email,
    password: user.password,
    name: user.name,
    role: "agent",
  });

  await openUsersAsAdmin(page);

  await page.getByRole("button", { name: `编辑用户 ${user.name}` }).click();
  await page.getByLabel("姓名").fill(next.name);
  await page.getByLabel("电子邮件").fill(next.email);
  await page.getByLabel("密码").fill(next.password);
  await page.getByRole("button", { name: "保存修改" }).click();

  await expect(page.getByRole("heading", { name: "编辑用户" })).toHaveCount(0);
  await expect(page.getByText(next.name)).toBeVisible();
  await expect(page.getByText(next.email)).toBeVisible();

  await signOut(page);
  await signIn(page, next.email, next.password);
  await expectHomePage(page);
});

test("delete: admin can soft-delete a user from the list", async ({ page }) => {
  const user = makeUser("deleter");

  await ensureCredentialUser({
    email: user.email,
    password: user.password,
    name: user.name,
    role: "agent",
  });

  await openUsersAsAdmin(page);

  await page.getByRole("button", { name: `删除用户 ${user.name}` }).click();
  await expect(page.getByRole("heading", { name: "确认删除用户" })).toBeVisible();
  await page.getByRole("button", { name: "确认删除" }).click();

  await expect(page.getByRole("heading", { name: "确认删除用户" })).toHaveCount(0);
  await expect(page.getByText(user.name)).toHaveCount(0);
  await expect(page.getByText(user.email)).toHaveCount(0);
});
