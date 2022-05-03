# TODO
# - Should we make all links to users optional? (so when they delete
# we don't have to delete everything that points to them)
# or should deleted users just be anonymized & but kept in the DB?

module default {
	type AccessPolicy {
		required property public -> bool;
		multi link writers -> User;
		# this should 
		multi link admins -> User;
	}

	# for now all clubs are public
	type Club {
		required property name -> str;
		required property description -> str;
		# for now: this will always be true
		required property shortId -> str {
			constraint exclusive;
		}
		multi link documents := .<club[is Document];
		required link accessPolicy -> AccessPolicy;
	}

	# TODO: Add type discriminator
	abstract type Document {
		required property name -> str;
		# default ids are too long for urls 
		required property shortId -> str {
			constraint exclusive;
		}
		required property storageHandle -> str;
		required link club -> Club;
		# A club should not have 2 documents with the same name
		constraint exclusive on ( (.club, .name) );
	}

	type PDF extending Document {
		multi link posts := .<document[is PDFPost];
		required property baseWidth -> int16;
		required property baseHeight -> int16;
	}

	type User {
		required property createdAt -> datetime;
		required property displayName -> str;
		required property email -> str;
		required property shortId -> str {
			constraint exclusive;
		}
		# null = use default (jsdenticon)
		required property image -> str;
		multi link votes := .<user[is Vote];
		multi link answers := .<user[is Answer];
		multi link identities := .<user[is Identity];
		multi link posts := .<user[is Post];
	}

	abstract type Identity {
		required link user -> User {
			constraint exclusive;
		}
	}

	type GoogleIdentity extending Identity  {
		required property sub -> str {
			constraint exclusive;
		}
		required property displayName -> str;
		required property email -> str;
	}

	abstract type Votable {
		multi link votes := .<votable[is Vote];
		required property score := (
			select sum(1 if .<votable[is Vote].up else -1)
		);
		required property upVotes := (
			select count(.<votable[is Vote].up = true)
		);
		required property downVotes := (
			select count(.<votable[is Vote].up = false)
		);
	}

	abstract type Post extending Votable {
		multi link answers := .<post[is Answer];
		required property shortId -> str {
			constraint exclusive;
		}
		required link user -> User;
		required property createdAt -> datetime;
		required property title -> str;
		required property content -> str;
	}

	type PDFPost extending Post {
		required link document -> PDF;

		required property excerpt -> str;
		required link excerptRect -> PDFRect;
		required property page -> int16;

		required property anchorIdx -> int16;
		required property focusIdx -> int16;
		required property anchorOffset -> int16;
		required property focusOffset -> int16;

		# maybe I should inline this as JSON?
		# (reasoning ... less space, more performant?)
		# edgedb  bug ...
		multi link rects -> PDFRect;
	}

	type PDFRect {
		required property x -> int16;
		required property y -> int16;
		required property width -> int16;
		required property height -> int16;
	}

	type Answer extending Votable {
		required property createdAt -> datetime;
		required property content -> str;

		required link user -> User;
		required link post -> Post;
	}

	type Vote {
		required property createdAt -> datetime;
		required property up -> bool;
		required link user -> User;
		required link votable -> Votable;
		constraint exclusive on ((.user, .votable));
	}
}