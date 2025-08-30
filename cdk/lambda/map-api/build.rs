fn main() {
    println!("cargo:rerun-if-changed=src/protos/vector_tile.proto");
    protobuf_codegen::Codegen::new()
        .protoc()
        .protoc_path(&protoc_bin_vendored::protoc_bin_path().unwrap())
        .includes(&["src/protos"])
        .input("src/protos/vector_tile.proto")
        .cargo_out_dir("protos")
        .run_from_script();
}
