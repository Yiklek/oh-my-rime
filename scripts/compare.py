import os
import argparse
import json
import copy


def create_parser():
    parser = argparse.ArgumentParser("compare")
    parser.add_argument("-s", "--source")
    parser.add_argument("--upstream-dir")
    parser.add_argument("--local")
    parser.add_argument("--editor", default="nvim")
    parser.add_argument("--map", default="upstream.json")
    return parser


EDITOR_COMMAND = {
    "nvim": "nvim -d {} {}",
    "vim": "vim -d {} {}"
}


def load_upstream(path):
    with open(path, "r") as f:
        return json.loads(f.read())


def compare_one(editor, local, upstream):
    cmd = EDITOR_COMMAND[editor].format(local, upstream)
    print(cmd)
    return os.system(cmd) >> 8


def main():
    parser = create_parser()
    args = parser.parse_args()
    upstreams = load_upstream(args.map)
    final_upstreams = dict()
    if not args.editor:
        print("no editor.")
        exit(1)
    for v in upstreams.values():
        final_upstreams.update(v)
    if args.source:
        if not args.upstream_dir:
            print("no upstream dir.")
            exit(1)
        final_upstreams = copy.deepcopy(upstreams[args.source])
    if args.local:
        up = final_upstreams[args.local]
        final_upstreams.clear()
        final_upstreams[args.local] = up
    for k, v in final_upstreams.items():
        res = compare_one(args.editor, k, os.path.join(args.upstream_dir, v))
        if res != 0:
            break


if __name__ == "__main__":
    main()
