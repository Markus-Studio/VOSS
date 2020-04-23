grammar Voss;

parse
  : declaration* EOF
  ;

declaration
  : structDeclaration
  | oneofDeclaration
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

// The lexer.

COL : ':';
SCOL : ';';
COM : ',';
OBRACE : '{';
CBRACE : '}';

ONEOF : 'oneof';
STRUCT : 'struct';

ID
 : [a-zA-Z_] [a-zA-Z_0-9]*
 ;

SPACE
 : [ \t\r\n] -> skip
 ;

OTHER
 : . 
 ;
