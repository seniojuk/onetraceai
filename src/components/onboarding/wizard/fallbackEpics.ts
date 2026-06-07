export function fallbackEpics(projectName: string) {
  return [
    { title: "Authentication and onboarding", description: `Sign up, sign in, and first-run experience for ${projectName}.` },
    { title: "Core workflow", description: "The primary path users take to get value." },
    { title: "Collaboration and sharing", description: "Inviting teammates and sharing what they produce." },
  ];
}
