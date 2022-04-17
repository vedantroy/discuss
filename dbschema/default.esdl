module default {
	type Club {
		required property name -> str;
		multi link documents := .<club[is Document];
	}

	abstract type Document {
		required property name -> str;
		# default ids are too long for urls 
		required property shortId -> str {
			constraint exclusive;
		}
		required link club -> Club
	}

	type PDF extending Document {
		required property url -> str;
	}

	type User {
		required property displayName -> str;
		multi link votes := .<user[is Vote];
		multi link answers := .<user[is Answer];
	}

	type Post {
		multi link votes := .<post[is Vote];
		multi link answers := .<post[is Answer];
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
