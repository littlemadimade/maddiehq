export const trackerStatuses = ["Ideas", "In Progress", "Ready", "Posted"] as const;

export type TrackerStatus = (typeof trackerStatuses)[number];

export type TrackerTask = {
  id: string;
  title: string;
  platform: string;
  due: string;
  note: string;
  status: TrackerStatus;
};

export function buildTrackerStorageKey(creatorId: string) {
  return `maddiehq:${creatorId}:tracker-tasks`;
}

export const defaultTrackerTasks: TrackerTask[] = [
  {
    id: "tracker-1",
    title: "Morning routine hook test",
    platform: "Instagram Reel",
    due: "Today",
    note: "Try a faster first line and tighter caption.",
    status: "Ideas"
  },
  {
    id: "tracker-2",
    title: "Soft-launch carousel concept",
    platform: "Instagram",
    due: "Tomorrow",
    note: "Turn one Reel topic into swipeable slides.",
    status: "Ideas"
  },
  {
    id: "tracker-3",
    title: "Behind-the-scenes Reel batch",
    platform: "Instagram Reel",
    due: "Today",
    note: "Need final trims and cover text.",
    status: "In Progress"
  },
  {
    id: "tracker-4",
    title: "Story poll follow-up set",
    platform: "Instagram",
    due: "Today",
    note: "Draft replies and CTA for traffic push.",
    status: "In Progress"
  },
  {
    id: "tracker-5",
    title: "Reel with direct text overlay",
    platform: "Instagram Reel",
    due: "Tonight",
    note: "Caption approved. Needs final posting window.",
    status: "Ready"
  },
  {
    id: "tracker-6",
    title: "Save-focused carousel recap",
    platform: "Instagram Carousel",
    due: "Tomorrow",
    note: "Built from a Reel topic that already performed well.",
    status: "Ready"
  },
  {
    id: "tracker-7",
    title: "Casual talking-head Reel",
    platform: "Instagram Reel",
    due: "Posted",
    note: "Check saves and profile visits tomorrow.",
    status: "Posted"
  },
  {
    id: "tracker-8",
    title: "Playful caption carousel",
    platform: "Instagram Carousel",
    due: "Posted",
    note: "Watch saves and shares during the first 24 hours.",
    status: "Posted"
  }
];

export function groupTasksByStatus(tasks: TrackerTask[]) {
  return trackerStatuses.map((status) => ({
    title: status,
    description:
      status === "Ideas"
        ? "Fresh concepts worth developing."
        : status === "In Progress"
          ? "Content actively being made."
          : status === "Ready"
            ? "Polished and ready to schedule or post."
            : "Recently published content to review later.",
    tasks: tasks.filter((task) => task.status === status)
  }));
}

export function buildTrackerStats(tasks: TrackerTask[]) {
  const dueToday = tasks.filter((task) => task.due.toLowerCase() === "today").length;
  const inProgress = tasks.filter((task) => task.status === "In Progress").length;
  const ready = tasks.filter((task) => task.status === "Ready").length;
  const blocked = tasks.filter((task) =>
    /(need|blocked|waiting)/i.test(task.note)
  ).length;

  return [
    { label: "Tasks Due Today", value: `${dueToday}`, detail: "Immediate focus" },
    { label: "Posts In Progress", value: `${inProgress}`, detail: "Execution workload" },
    { label: "Ready To Post", value: `${ready}`, detail: "Content close to live" },
    { label: "Blocked Items", value: `${blocked}`, detail: "Needs input or edits" }
  ];
}
