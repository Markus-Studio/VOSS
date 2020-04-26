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
  : ID COL type SCOL
  ;

oneofDeclaration
  : ONEOF ID OBRACE oneofMembers CBRACE
  ;

oneofMembers
  : (oneofMember COM)* oneofMember?
  ;

oneofMember
  : ID (OPAR ID CPAR)?
  ;

objectDeclaration
  : OBJECT ID OBRACE objectMembers CBRACE
  ;

objectMembers
  : objectMember*
  ;

objectMember
  : objectField
  | objectView
  ;

objectField
  : ID COL type SCOL
  ;

objectView
  : VIEW OPAR ID COM ID CPAR ID SCOL
  ;

type
  : primitiveType
  ;

primitiveType
  : ID
  ;

// The lexer.

COL : ':';
SCOL : ';';
COM : ',';
OPAR : '(';
CPAR : ')';
OBRACE : '{';
CBRACE : '}';
OBRACK : '[';
CBRACK : ']';

STRUCT : 'struct';
ONEOF : 'oneof';
OBJECT : 'object';
VIEW : '@View';

ID
 : [a-zA-Z_] [a-zA-Z_0-9]*
 ;

SPACE
 : [ \t\r\n] -> skip
 ;

COMMENT
 : '//' ~('\n')* -> skip
 ;

OTHER
 : . 
 ;
