# TODO
# - Should we make all links to users optional? (so when they delete
# we don't have to delete everything that points to them)
# or should deleted users just be anonymized & but kept in the DB?

module default {
	# for now all clubs are public
	type Club {
		required property name -> str;
		# for now: this will always be true
		required property public -> bool;
		required property shortId -> str {
			constraint exclusive;
		}
		multi link documents := .<club[is Document];
		multi link users -> User;
	}

	# TODO: Add type discriminator
	abstract type Document {
		required property name -> str;
		# default ids are too long for urls 
		required property shortId -> str {
			constraint exclusive;
		}
		required link club -> Club;
		# A club should not have 2 documents with the same name
		constraint exclusive on ( (.club, .name) );
	}

	type PDF extending Document {
		required property url -> str;
		multi link posts := .<document[is PDFPost];
	}

	type User {
		required property createdAt -> datetime;
		required property displayName -> str;
		required property email -> str;
		required property shortId -> str {
			constraint exclusive;
		}
		# null = use default (jsdenticon)
		property image -> str;
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
	
	abstract type Post {
		multi link votes := .<post[is Vote];
		multi link answers := .<post[is Answer];
		required property shortId -> str {
			constraint exclusive;
		}
		required link user -> User;
		required property createdAt -> datetime;
		required property title -> str;
		required property content -> str;
		# Cached value of the post's score (instead of querying votes everytime)
		required property score -> int16;
	}

	type PDFPost extending Post {
		# TODO: See if we can make abstract links
		required link document -> PDF;

		# Initially I had this split up into 2 separate classes:
		# Highlight & Post
		# However, each highlight belongs to 1 post & vice-versa
		# so I merged the classes

		required property excerpt -> str;
		required link excerptRect -> PDFRect;
		required property page -> int16;
		required property anchorIdx -> int16;
		required property focusIdx -> int16;
		required property anchorOffset -> int16;
		required property focusOffset -> int16;

		# maybe I should inline this as JSON?
		# (reasoning ... less space, more performant?)
		required multi link rects -> PDFRect;
	}

	type PDFRect {
		required property x -> int16;
		required property y -> int16;
		required property width -> int16;
		required property height -> int16;
	}

	type Answer {
		required property createdAt -> datetime;
		required property content -> str;

		required link user -> User;
		required link post -> Post;
	}

	type Vote {
		required property createdAt -> datetime;
		required property up -> bool;

		required link user -> User;
		required link post -> Post;
	}
}