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
  : ID COL type SCOL
  ;

type
  : tupleType
  | primitiveType
  ;

primitiveType
  : ID
  ;

tupleType
  : OBRACK tupleMembers CBRACK
  ;

tupleMembers
  : (tupleMember COM)* tupleMember?
  ;

tupleMember
  : tupleType
  | primitiveType
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

ID
 : [a-zA-Z_] [a-zA-Z_0-9]*
 ;

SPACE
 : [ \t\r\n] -> skip
 ;

OTHER
 : . 
 ;
