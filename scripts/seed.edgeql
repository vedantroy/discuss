delete PDF;
delete Club;
insert PDF {
	name := "Test Document",
	shortId := "test-doc-id",
	url := "/crypto.pdf",
	baseWidth := 612,
	baseHeight := 792,
	club := (insert Club {
		name := "Test Club",
		public := true,
		shortId := "test-club-id"
	})
};
