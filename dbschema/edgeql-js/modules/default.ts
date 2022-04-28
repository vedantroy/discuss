import { $ } from "edgedb";
import * as _ from "../imports";
import type * as _std from "./std";
export type $VotableλShape = $.typeutil.flatten<_std.$Object_c3fc4d9ba62411ec858e5119572450e1λShape & {
  "votes": $.LinkDesc<$Vote, $.Cardinality.Many, {}, false, true,  false, false>;
  "downVotes": $.PropertyDesc<_std.$int64, $.Cardinality.One, false, true, false, false>;
  "score": $.PropertyDesc<_std.$int64, $.Cardinality.One, false, true, false, false>;
  "upVotes": $.PropertyDesc<_std.$int64, $.Cardinality.One, false, true, false, false>;
  "<votable[is Vote]": $.LinkDesc<$Vote, $.Cardinality.Many, {}, false, false,  false, false>;
  "<votable": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Votable = $.ObjectType<"default::Votable", $VotableλShape, null>;
const $Votable = $.makeType<$Votable>(_.spec, "dee8da6e-c6d6-11ec-b472-b77d8c430aa6", _.syntax.literal);

const Votable: $.$expr_PathNode<$.TypeSet<$Votable, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Votable, $.Cardinality.Many), null, true);

export type $AnswerλShape = $.typeutil.flatten<$VotableλShape & {
  "post": $.LinkDesc<$Post, $.Cardinality.One, {}, false, false,  false, false>;
  "user": $.LinkDesc<$User, $.Cardinality.One, {}, false, false,  false, false>;
  "content": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "createdAt": $.PropertyDesc<_std.$datetime, $.Cardinality.One, false, false, false, false>;
  "<answers[is Post]": $.LinkDesc<$Post, $.Cardinality.Many, {}, false, false,  false, false>;
  "<answers[is PDFPost]": $.LinkDesc<$PDFPost, $.Cardinality.Many, {}, false, false,  false, false>;
  "<answers[is User]": $.LinkDesc<$User, $.Cardinality.Many, {}, false, false,  false, false>;
  "<answers": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Answer = $.ObjectType<"default::Answer", $AnswerλShape, null>;
const $Answer = $.makeType<$Answer>(_.spec, "deed84bd-c6d6-11ec-8e09-8fe29d69a0b6", _.syntax.literal);

const Answer: $.$expr_PathNode<$.TypeSet<$Answer, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Answer, $.Cardinality.Many), null, true);

export type $ClubλShape = $.typeutil.flatten<_std.$Object_c3fc4d9ba62411ec858e5119572450e1λShape & {
  "users": $.LinkDesc<$User, $.Cardinality.Many, {}, false, false,  false, false>;
  "documents": $.LinkDesc<$Document, $.Cardinality.Many, {}, false, true,  false, false>;
  "name": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "public": $.PropertyDesc<_std.$bool, $.Cardinality.One, false, false, false, false>;
  "shortId": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
  "<club[is Document]": $.LinkDesc<$Document, $.Cardinality.Many, {}, false, false,  false, false>;
  "<club[is PDF]": $.LinkDesc<$PDF, $.Cardinality.Many, {}, false, false,  false, false>;
  "<club": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Club = $.ObjectType<"default::Club", $ClubλShape, null>;
const $Club = $.makeType<$Club>(_.spec, "df9856a7-c6d6-11ec-9d81-170f2068c8a3", _.syntax.literal);

const Club: $.$expr_PathNode<$.TypeSet<$Club, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Club, $.Cardinality.Many), null, true);

export type $DocumentλShape = $.typeutil.flatten<_std.$Object_c3fc4d9ba62411ec858e5119572450e1λShape & {
  "club": $.LinkDesc<$Club, $.Cardinality.One, {}, false, false,  false, false>;
  "name": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "shortId": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
  "<documents[is Club]": $.LinkDesc<$Club, $.Cardinality.Many, {}, false, false,  false, false>;
  "<documents": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Document = $.ObjectType<"default::Document", $DocumentλShape, null>;
const $Document = $.makeType<$Document>(_.spec, "df9bc710-c6d6-11ec-a35c-89939394382e", _.syntax.literal);

const Document: $.$expr_PathNode<$.TypeSet<$Document, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Document, $.Cardinality.Many), null, true);

export type $IdentityλShape = $.typeutil.flatten<_std.$Object_c3fc4d9ba62411ec858e5119572450e1λShape & {
  "user": $.LinkDesc<$User, $.Cardinality.One, {}, true, false,  false, false>;
  "<identities[is User]": $.LinkDesc<$User, $.Cardinality.Many, {}, false, false,  false, false>;
  "<identities": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Identity = $.ObjectType<"default::Identity", $IdentityλShape, null>;
const $Identity = $.makeType<$Identity>(_.spec, "dfaabe8d-c6d6-11ec-952a-9f134924ec77", _.syntax.literal);

const Identity: $.$expr_PathNode<$.TypeSet<$Identity, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Identity, $.Cardinality.Many), null, true);

export type $GoogleIdentityλShape = $.typeutil.flatten<$IdentityλShape & {
  "displayName": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "email": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "sub": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
}>;
type $GoogleIdentity = $.ObjectType<"default::GoogleIdentity", $GoogleIdentityλShape, null>;
const $GoogleIdentity = $.makeType<$GoogleIdentity>(_.spec, "dfad9d7b-c6d6-11ec-9fa9-e32117efa453", _.syntax.literal);

const GoogleIdentity: $.$expr_PathNode<$.TypeSet<$GoogleIdentity, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($GoogleIdentity, $.Cardinality.Many), null, true);

export type $PDFλShape = $.typeutil.flatten<$DocumentλShape & {
  "posts": $.LinkDesc<$PDFPost, $.Cardinality.Many, {}, false, true,  false, false>;
  "baseHeight": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, false>;
  "baseWidth": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, false>;
  "url": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "<document[is PDFPost]": $.LinkDesc<$PDFPost, $.Cardinality.Many, {}, false, false,  false, false>;
  "<document": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $PDF = $.ObjectType<"default::PDF", $PDFλShape, null>;
const $PDF = $.makeType<$PDF>(_.spec, "dfa4df27-c6d6-11ec-86da-6f7d8260704b", _.syntax.literal);

const PDF: $.$expr_PathNode<$.TypeSet<$PDF, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($PDF, $.Cardinality.Many), null, true);

export type $PostλShape = $.typeutil.flatten<$VotableλShape & {
  "answers": $.LinkDesc<$Answer, $.Cardinality.Many, {}, false, true,  false, false>;
  "user": $.LinkDesc<$User, $.Cardinality.One, {}, false, false,  false, false>;
  "content": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "createdAt": $.PropertyDesc<_std.$datetime, $.Cardinality.One, false, false, false, false>;
  "shortId": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
  "title": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "<post[is Answer]": $.LinkDesc<$Answer, $.Cardinality.Many, {}, false, false,  false, false>;
  "<posts[is User]": $.LinkDesc<$User, $.Cardinality.Many, {}, false, false,  false, false>;
  "<post": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<posts": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Post = $.ObjectType<"default::Post", $PostλShape, null>;
const $Post = $.makeType<$Post>(_.spec, "def19b16-c6d6-11ec-852e-935d628e749b", _.syntax.literal);

const Post: $.$expr_PathNode<$.TypeSet<$Post, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Post, $.Cardinality.Many), null, true);

export type $PDFPostλShape = $.typeutil.flatten<$PostλShape & {
  "excerptRect": $.LinkDesc<$PDFRect, $.Cardinality.One, {}, false, false,  false, false>;
  "rects": $.LinkDesc<$PDFRect, $.Cardinality.Many, {}, false, false,  false, false>;
  "document": $.LinkDesc<$PDF, $.Cardinality.One, {}, false, false,  false, false>;
  "anchorIdx": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, false>;
  "anchorOffset": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, false>;
  "excerpt": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "focusIdx": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, false>;
  "focusOffset": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, false>;
  "page": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, false>;
  "<posts[is PDF]": $.LinkDesc<$PDF, $.Cardinality.Many, {}, false, false,  false, false>;
  "<posts": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $PDFPost = $.ObjectType<"default::PDFPost", $PDFPostλShape, null>;
const $PDFPost = $.makeType<$PDFPost>(_.spec, "df03aae3-c6d6-11ec-93e7-73a41c54ab1e", _.syntax.literal);

const PDFPost: $.$expr_PathNode<$.TypeSet<$PDFPost, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($PDFPost, $.Cardinality.Many), null, true);

export type $PDFRectλShape = $.typeutil.flatten<_std.$Object_c3fc4d9ba62411ec858e5119572450e1λShape & {
  "height": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, false>;
  "width": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, false>;
  "x": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, false>;
  "y": $.PropertyDesc<_std.$int16, $.Cardinality.One, false, false, false, false>;
  "<excerptRect[is PDFPost]": $.LinkDesc<$PDFPost, $.Cardinality.Many, {}, false, false,  false, false>;
  "<rects[is PDFPost]": $.LinkDesc<$PDFPost, $.Cardinality.Many, {}, false, false,  false, false>;
  "<excerptRect": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<rects": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $PDFRect = $.ObjectType<"default::PDFRect", $PDFRectλShape, null>;
const $PDFRect = $.makeType<$PDFRect>(_.spec, "def91141-c6d6-11ec-9ec7-3755b610047d", _.syntax.literal);

const PDFRect: $.$expr_PathNode<$.TypeSet<$PDFRect, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($PDFRect, $.Cardinality.Many), null, true);

export type $UserλShape = $.typeutil.flatten<_std.$Object_c3fc4d9ba62411ec858e5119572450e1λShape & {
  "answers": $.LinkDesc<$Answer, $.Cardinality.Many, {}, false, true,  false, false>;
  "identities": $.LinkDesc<$Identity, $.Cardinality.Many, {}, false, true,  false, false>;
  "posts": $.LinkDesc<$Post, $.Cardinality.Many, {}, false, true,  false, false>;
  "votes": $.LinkDesc<$Vote, $.Cardinality.Many, {}, false, true,  false, false>;
  "createdAt": $.PropertyDesc<_std.$datetime, $.Cardinality.One, false, false, false, false>;
  "displayName": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "email": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "image": $.PropertyDesc<_std.$str, $.Cardinality.One, false, false, false, false>;
  "shortId": $.PropertyDesc<_std.$str, $.Cardinality.One, true, false, false, false>;
  "<user[is Answer]": $.LinkDesc<$Answer, $.Cardinality.Many, {}, false, false,  false, false>;
  "<user[is Vote]": $.LinkDesc<$Vote, $.Cardinality.Many, {}, false, false,  false, false>;
  "<users[is Club]": $.LinkDesc<$Club, $.Cardinality.Many, {}, false, false,  false, false>;
  "<user[is Identity]": $.LinkDesc<$Identity, $.Cardinality.AtMostOne, {}, true, false,  false, false>;
  "<user[is GoogleIdentity]": $.LinkDesc<$GoogleIdentity, $.Cardinality.AtMostOne, {}, true, false,  false, false>;
  "<user[is Post]": $.LinkDesc<$Post, $.Cardinality.Many, {}, false, false,  false, false>;
  "<user[is PDFPost]": $.LinkDesc<$PDFPost, $.Cardinality.Many, {}, false, false,  false, false>;
  "<user": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
  "<users": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $User = $.ObjectType<"default::User", $UserλShape, null>;
const $User = $.makeType<$User>(_.spec, "df132d60-c6d6-11ec-80ce-dff04159523a", _.syntax.literal);

const User: $.$expr_PathNode<$.TypeSet<$User, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($User, $.Cardinality.Many), null, true);

export type $VoteλShape = $.typeutil.flatten<_std.$Object_c3fc4d9ba62411ec858e5119572450e1λShape & {
  "votable": $.LinkDesc<$Votable, $.Cardinality.One, {}, false, false,  false, false>;
  "user": $.LinkDesc<$User, $.Cardinality.One, {}, false, false,  false, false>;
  "up": $.PropertyDesc<_std.$bool, $.Cardinality.One, false, false, false, false>;
  "createdAt": $.PropertyDesc<_std.$datetime, $.Cardinality.One, false, false, false, false>;
  "<votes[is Votable]": $.LinkDesc<$Votable, $.Cardinality.Many, {}, false, false,  false, false>;
  "<votes[is Answer]": $.LinkDesc<$Answer, $.Cardinality.Many, {}, false, false,  false, false>;
  "<votes[is Post]": $.LinkDesc<$Post, $.Cardinality.Many, {}, false, false,  false, false>;
  "<votes[is PDFPost]": $.LinkDesc<$PDFPost, $.Cardinality.Many, {}, false, false,  false, false>;
  "<votes[is User]": $.LinkDesc<$User, $.Cardinality.Many, {}, false, false,  false, false>;
  "<votes": $.LinkDesc<$.ObjectType, $.Cardinality.Many, {}, false, false,  false, false>;
}>;
type $Vote = $.ObjectType<"default::Vote", $VoteλShape, null>;
const $Vote = $.makeType<$Vote>(_.spec, "df2118a7-c6d6-11ec-a065-2b899281204f", _.syntax.literal);

const Vote: $.$expr_PathNode<$.TypeSet<$Vote, $.Cardinality.Many>, null, true> = _.syntax.$PathNode($.$toSet($Vote, $.Cardinality.Many), null, true);



export { $Votable, Votable, $Answer, Answer, $Club, Club, $Document, Document, $Identity, Identity, $GoogleIdentity, GoogleIdentity, $PDF, PDF, $Post, Post, $PDFPost, PDFPost, $PDFRect, PDFRect, $User, User, $Vote, Vote };

type __defaultExports = {
  "Votable": typeof Votable;
  "Answer": typeof Answer;
  "Club": typeof Club;
  "Document": typeof Document;
  "Identity": typeof Identity;
  "GoogleIdentity": typeof GoogleIdentity;
  "PDF": typeof PDF;
  "Post": typeof Post;
  "PDFPost": typeof PDFPost;
  "PDFRect": typeof PDFRect;
  "User": typeof User;
  "Vote": typeof Vote
};
const __defaultExports: __defaultExports = {
  "Votable": Votable,
  "Answer": Answer,
  "Club": Club,
  "Document": Document,
  "Identity": Identity,
  "GoogleIdentity": GoogleIdentity,
  "PDF": PDF,
  "Post": Post,
  "PDFPost": PDFPost,
  "PDFRect": PDFRect,
  "User": User,
  "Vote": Vote
};
export default __defaultExports;
