grammar Voss;

parse
  : block EOF
  ;

block
  : declaration;

declaration
  : structDeclaration
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

// The lexer.

COL : ':';
SCOL : ';';
OBRACE : '{';
CBRACE : '}';

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
