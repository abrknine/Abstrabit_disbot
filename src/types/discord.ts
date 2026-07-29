export enum InteractionType {
  PING = 1,
  APPLICATION_COMMAND = 2,
  MESSAGE_COMPONENT = 3,
  MODAL_SUBMIT = 5,
}

export enum InteractionCallbackType {
  PONG = 1,
  CHANNEL_MESSAGE_WITH_SOURCE = 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
  UPDATE_MESSAGE = 7,
  MODAL = 9,
}

/** Discord message flag: only the invoking user sees the reply. */
export const EPHEMERAL = 1 << 6;

export interface CommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
}

export interface ModalField {
  type: number;
  custom_id: string;
  value?: string;
}

export interface ActionRow<T> {
  type: 1;
  components: T[];
}

export interface Button {
  type: 2;
  style: number;
  label: string;
  custom_id: string;
  disabled?: boolean;
}

export interface TextInput {
  type: 4;
  custom_id: string;
  label: string;
  style: 1 | 2;
  required?: boolean;
  max_length?: number;
  placeholder?: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
}

export interface Interaction {
  id: string;
  application_id: string;
  type: InteractionType;
  token: string;
  guild_id?: string;
  channel_id?: string;
  member?: { user: DiscordUser };
  user?: DiscordUser;
  data?: {
    name?: string;
    options?: CommandOption[];
    custom_id?: string;
    components?: ActionRow<ModalField>[];
  };
}

export interface InteractionResponse {
  type: InteractionCallbackType;
  data?: {
    content?: string;
    flags?: number;
    components?: ActionRow<Button | TextInput>[];
    custom_id?: string;
    title?: string;
  };
}
