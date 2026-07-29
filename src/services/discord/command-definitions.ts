/** Single source of truth for the slash-command menu registered with Discord. */
export const commandDefinitions = [
  {
    name: "report",
    description: "File a support ticket (opens a form)",
    type: 1, // CHAT_INPUT
  },
  {
    name: "status",
    description: "Show the live ticket queue",
    type: 1,
  },
];
