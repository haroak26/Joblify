import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

export function AdminAuditLogs() {
  const [page, setPage] = useState(1);

  // Fetch audit logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ["/api/admin/logs", { page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      const res = await fetch(`/api/admin/logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "BLOCK_ACCOUNT":
        return <Badge variant="destructive">Block Account</Badge>;
      case "UNBLOCK_ACCOUNT":
        return <Badge variant="outline" className="border-green-500 text-green-500">Unblock Account</Badge>;
      case "BLOCK_AI_ACCESS":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Block AI</Badge>;
      case "UNBLOCK_AI_ACCESS":
        return <Badge variant="outline">Unblock AI</Badge>;
      case "AWARD_PERK":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Award Perk</Badge>;
      default:
        return <Badge>{action}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Audit Logs</CardTitle>
        <CardDescription>
          Track all administrative actions for security and compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target User</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : logsData?.logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No logs found</TableCell>
                </TableRow>
              ) : (
                logsData?.logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{log.adminUserId.slice(0, 8)}...</code>
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      {log.targetUserId ? (
                        <code className="text-xs">{log.targetUserId.slice(0, 8)}...</code>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {log.details && typeof log.details === "object" ? (
                        <div className="text-xs">
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {logsData && logsData.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} of {logsData.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= logsData.totalPages}
                onClick={() => setPage((p) => Math.min(logsData.totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
