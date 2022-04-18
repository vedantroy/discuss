module default {
	type Club {
		required property name -> str;
		required property shortId -> str {
			constraint exclusive;
		}
		multi link documents := .<club[is Document];
	}

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
	}

	type User {
		required property displayName -> str;
		required property shortId -> str {
			constraint exclusive;
		}
		multi link votes := .<user[is Vote];
		multi link answers := .<user[is Answer];
		link googleIdentity := .<user[is GoogleIdentity];
	}

	type GoogleIdentity {
		required property sub -> str {
			constraint exclusive;
		}
		required property displayName -> str;
		required property email -> str;
		required link user -> User;
	}
	

	type Post {
		multi link votes := .<post[is Vote];
		multi link answers := .<post[is Answer];
		required property shortId -> str {
			constraint exclusive;
		}
		required property title -> str;
		required property content -> str;
		# Cached value of the post's score (instead of querying votes everytime)
		required property score -> str;
	}

	type Answer {
		required property content -> str;

		required link user -> User;
		required link post -> Post;
	}

	type Vote {
		required property up -> bool;
		required property createdAt -> datetime;

		required link user -> User;
		required link post -> Post;
	}
}
