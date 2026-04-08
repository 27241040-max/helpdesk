import { useQuery } from "@tanstack/react-query";

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
import { Skeleton } from "@/components/ui/skeleton";

import { apiClient } from "../lib/api-client";

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

function getRoleBadgeClassName(role: UserListItem["role"]) {
  if (role === "admin") {
    return "border-transparent bg-primary text-primary-foreground";
  }

  return "border-border bg-secondary text-secondary-foreground";
}

function UsersTableSkeleton() {
  return (
    <div className="px-4 pb-4 md:px-6">
      <div className="rounded-xl border border-border/70">
        <div className="grid grid-cols-5 gap-4 border-b border-border bg-muted/20 px-4 py-3">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>

        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-5 items-center gap-4 border-b border-border/70 px-4 py-4 last:border-b-0"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsersPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiClient.get<UsersResponse>("/api/users");
      return response.data;
    },
  });

  if (isError) {
    console.error("用户列表加载失败:", error);
  }

  const users = data?.users ?? [];

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

        {isPending ? (
          <UsersTableSkeleton />
        ) : isError ? (
          <CardContent className="pb-6 pt-2 text-sm text-destructive">
            用户列表加载失败，请稍后再试。
          </CardContent>
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
                      <Badge
                        className={`uppercase tracking-[0.12em] ${getRoleBadgeClassName(user.role)}`}
                        variant="outline"
                      >
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
