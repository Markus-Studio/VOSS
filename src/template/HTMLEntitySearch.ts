import NamedCharacters from './entities';

const keys = Object.keys(NamedCharacters);

export class HTMLEntitySearch {
  public mostRecent?: string;
  private keys: string[] = keys;
  private cursor = 0;

  advance(nextCharacter: string) {
    const cursor = this.cursor + 1;
    for (let i = 0; i < this.keys.length; ++i) {
      if (this.keys[i][cursor] === nextCharacter) {
        return true;
      }
    }
    return false;
  }

  consume(nextCharacter: string) {
    const cursor = ++this.cursor;
    const newArray = []; // this.keys
    for (let i = 0; i < this.keys.length; ++i) {
      if (this.keys[i][cursor] === nextCharacter) {
        newArray.push(this.keys[i]);
        if (this.keys[i].length - 1 === cursor) {
          this.mostRecent = this.keys[i];
        }
      }
    }
    this.keys = newArray;
  }

  getMostRecentUnicode() {
    if (!this.mostRecent) throw new Error('MostRecent is undefined.');
    return NamedCharacters[this.mostRecent].characters;
  }

  reset() {
    this.mostRecent = undefined;
    this.keys = keys;
    this.cursor = 0;
  }
}
