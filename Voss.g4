grammar Voss;

parse
  : declaration* EOF
  ;

declaration
  : structDeclaration
  | oneofDeclaration
  | objectDeclaration
  ;

structDeclaration
  : STRUCT ID OBRACE structMembers CBRACE
  ;

structMembers
  : structMember*
  ;

structMember
  : ID COL ID SCOL
  ;

oneofDeclaration
  : ONEOF ID OBRACE oneofMembers CBRACE
  ;

oneofMembers
  : oneofMember (COM oneofMember)*
  ;

oneofMember
  : ID (COL ID)?
  ;

objectDeclaration
  : OBJECT ID OBRACE objectMembers CBRACE
  ;

objectMembers
  : objectMember*
  ;

objectMember
  : ID COL ID
  ;

// The lexer.

COL : ':';
SCOL : ';';
COM : ',';
OBRACE : '{';
CBRACE : '}';

STRUCT : 'struct';
ONEOF : 'oneof';
OBJECT : 'object';

ID
 : [a-zA-Z_] [a-zA-Z_0-9]*
 ;

SPACE
 : [ \t\r\n] -> skip
 ;

OTHER
 : . 
 ;
