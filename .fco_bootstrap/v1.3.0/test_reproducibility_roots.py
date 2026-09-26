from reproducibility_roots import ordered_sequence_root, canonical_source_tree_root


def test_ordered_root_changes_with_order():
    a = ordered_sequence_root([b"alpha", b"beta"])
    b = ordered_sequence_root([b"beta", b"alpha"])
    assert a != b


def test_ordered_root_is_stable():
    assert ordered_sequence_root([b"alpha", b"beta"]) == ordered_sequence_root([b"alpha", b"beta"])


def test_tree_root_binds_paths_and_bytes(tmp_path):
    (tmp_path / "a.txt").write_text("same")
    (tmp_path / "b.txt").write_text("same")
    first = canonical_source_tree_root(tmp_path, ["a.txt", "b.txt"])
    second = canonical_source_tree_root(tmp_path, ["b.txt", "a.txt"])
    assert first == second
    (tmp_path / "b.txt").write_text("changed")
    assert canonical_source_tree_root(tmp_path, ["a.txt", "b.txt"]) != first
