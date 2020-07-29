import argparse


def replace_hosting_bucket(template_path, save_path, hosting_bucket_name):
    with open(template_path, "rt") as file_in:
        with open(save_path, "wt") as file_out:
            for line in file_in:
                file_out.write(line.replace('__HOSTING_BUCKET__', hosting_bucket_name))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--template', help='Template Path')
    parser.add_argument('--save', help='Where to save the modified template')
    parser.add_argument('--bucket', help='Hosting bucket name')
    args = parser.parse_args()
    replace_hosting_bucket(args.template, args.save, args.bucket)
