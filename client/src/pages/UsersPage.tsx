import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { createApiUrl } from "../lib/api";

type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

type UsersResponse = {
  users: UserListItem[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    fetch(createApiUrl("/api/users"), {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Users request failed with ${response.status}`);
        }

        return (await response.json()) as UsersResponse;
      })
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setUsers(data.users);
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        console.error("用户列表加载失败:", error);

        if (!isMounted) {
          return;
        }

        setErrorMessage("用户列表加载失败，请稍后再试。");
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="grid gap-6">
      <Card className="gap-0 rounded-2xl">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <Badge className="w-fit uppercase" variant="secondary">
              Admin Only
            </Badge>
            <CardTitle className="text-[1.55rem] font-semibold tracking-[-0.04em]">
              Users
            </CardTitle>
            <CardDescription className="text-[0.95rem] leading-6">
              仅管理员可查看系统内的账号列表。这里展示当前用户的基础资料、角色和邮箱验证状态。
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-card-foreground">用户列表</h3>
            <p className="mt-1 text-sm text-muted-foreground">当前共 {users.length} 个用户</p>
          </div>
        </CardContent>

        {isLoading ? (
          <CardContent className="pb-6 pt-2 text-sm text-muted-foreground">
            正在加载用户列表...
          </CardContent>
        ) : errorMessage ? (
          <CardContent className="pb-6 pt-2 text-sm text-destructive">{errorMessage}</CardContent>
        ) : users.length === 0 ? (
          <CardContent className="pb-6 pt-2 text-sm text-muted-foreground">
            暂无用户数据。
          </CardContent>
        ) : (
          <div className="px-4 pb-4 md:px-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>用户</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>邮箱验证</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>最近更新</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="align-top">
                      <strong className="block text-sm text-card-foreground">{user.name}</strong>
                      <span className="mt-1 block text-sm text-muted-foreground">{user.email}</span>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge className="uppercase tracking-[0.12em]" variant="outline">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={user.emailVerified ? "secondary" : "outline"}>
                        {user.emailVerified ? "已验证" : "未验证"}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {formatDate(user.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </section>
  );
}
