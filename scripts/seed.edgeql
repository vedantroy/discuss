delete PDF;
delete Club;
insert PDF {
	name := "Test Document",
	shortId := "test-doc-id",
	url := "/test.pdf",
	club := (insert Club {
		name := "Test Club",
		public := true,
		shortId := "test-club-id"
	})
};