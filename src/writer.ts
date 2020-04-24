export interface Writer {
  write(chunk: string): void;
  indent(): void;
  dedent(): void;
}
