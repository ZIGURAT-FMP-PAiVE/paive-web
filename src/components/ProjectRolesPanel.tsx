import { Shield, UserPlus, Trash2 } from "lucide-react";
import type { ProjectMember, ProjectRole } from "@/lib/projects";
import { ROLE_LABELS } from "@/lib/projectPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, dataTableZebraClass } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

const field = "w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-lg outline-none placeholder:text-muted-foreground focus:border-primary";

const ROLE_PERMISSIONS_COPY: Record<ProjectRole, string> = {
  admin: "Set up the project, upload IFC and cost data, edit configuration, manage members, and submit VE decisions.",
  viewer: "Explore models, run the workflow, and export reports. Cannot upload, delete, or change project settings.",
};

function newMemberId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `member-${Date.now()}`;
}

export function ProjectRolesPanel({
  members,
  onChange,
  canManage,
  currentUserEmail,
}: {
  members: ProjectMember[];
  onChange: (members: ProjectMember[]) => void;
  canManage: boolean;
  currentUserEmail: string;
}) {
  const [draftEmail, setDraftEmail] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftRole, setDraftRole] = useState<ProjectRole>("viewer");

  const addMember = () => {
    const email = draftEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === email)) {
      toast.error("This email is already on the project");
      return;
    }
    onChange([
      ...members,
      {
        id: newMemberId(),
        email,
        name: draftName.trim() || email.split("@")[0]!,
        role: draftRole,
      },
    ]);
    setDraftEmail("");
    setDraftName("");
    setDraftRole("viewer");
    toast.success("Member added");
  };

  const removeMember = (id: string) => {
    const target = members.find((m) => m.id === id);
    if (!target) return;
    if (members.filter((m) => m.role === "admin").length === 1 && target.role === "admin") {
      toast.error("Keep at least one BIM Manager / Admin on the project");
      return;
    }
    onChange(members.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-6">
      <section className="glass p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-bold tracking-widest text-primary">05 / ROLES</div>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">People & permissions</h3>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Assign BIM Manager / Admin or Viewer access per person on this project.
            </p>
          </div>
          <Shield className="h-7 w-7 text-muted-foreground" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(Object.keys(ROLE_PERMISSIONS_COPY) as ProjectRole[]).map((role) => (
            <div key={role} className="rounded-xl border border-border bg-background/40 p-4">
              <div className="font-semibold text-foreground">{ROLE_LABELS[role]}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ROLE_PERMISSIONS_COPY[role]}</p>
            </div>
          ))}
        </div>

        <Table className="mt-8 min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {canManage && <TableHead className="w-[4rem]" />}
            </TableRow>
          </TableHeader>
          <TableBody className={dataTableZebraClass}>
            {members.map((m) => {
              const isYou = m.email.toLowerCase() === currentUserEmail.toLowerCase();
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.name}
                    {isYou && (
                      <span className="ml-2 text-xs font-normal text-primary">(you)</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{m.email}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <select
                        className={cn(field, "h-10 py-2 text-base")}
                        value={m.role}
                        onChange={(e) =>
                          onChange(
                            members.map((x) =>
                              x.id === m.id ? { ...x, role: e.target.value as ProjectRole } : x,
                            ),
                          )
                        }
                      >
                        <option value="admin">{ROLE_LABELS.admin}</option>
                        <option value="viewer">{ROLE_LABELS.viewer}</option>
                      </select>
                    ) : (
                      ROLE_LABELS[m.role]
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => removeMember(m.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      {canManage && (
        <section className="glass p-8">
          <h3 className="text-lg font-semibold">Add member</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_12rem_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                placeholder="name@company.eu"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-name">Display name</Label>
              <Input
                id="member-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Optional"
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Role</Label>
              <select
                id="member-role"
                className={cn(field, "h-11 py-2")}
                value={draftRole}
                onChange={(e) => setDraftRole(e.target.value as ProjectRole)}
              >
                <option value="admin">{ROLE_LABELS.admin}</option>
                <option value="viewer">{ROLE_LABELS.viewer}</option>
              </select>
            </div>
            <Button type="button" className="h-11 gap-2" onClick={addMember}>
              <UserPlus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}