import { Suspense, useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import useDebounce from "@/hooks/useDebounce";
import useGetClassifications from "@/hooks/incidentClassification/useGetClassifications";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectField, type Option } from "@/components/common/form/FormFields";

interface CategoryFormValues {
  categoryId: string;
  subcategoryId?: string;
}

interface CategoryFieldsProps {
  // The incident's current category, which may not be on the first page of results.
  current?: { category?: Option; subcategory?: Option };
}

const CategoryOptions = ({ search, current }: CategoryFieldsProps & { search: string }) => {
  const { getValues, setValue } = useFormContext<CategoryFormValues>();
  const categoryId = useWatch<CategoryFormValues>({ name: "categoryId" }) as string;
  const { fireIncidentClassifications } = useGetClassifications(1, search);

  const categories = fireIncidentClassifications.data;
  const categoryOptions: Option[] = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));
  if (
    current?.category &&
    !categoryOptions.some((option) => option.value === current.category?.value)
  ) {
    categoryOptions.unshift(current.category);
  }

  const selected = categories.find((category) => category.id === categoryId);
  const subcategoryOptions: Option[] = selected
    ? selected.subCategories.map((sub) => ({ value: sub.id, label: sub.name }))
    : current?.subcategory && categoryId === current.category?.value
      ? [current.subcategory]
      : [];

  // Clear a subcategory that doesn't belong to the newly chosen category. Only
  // when that category is in the current results, so searching never clears it.
  const knownSubcategoryIds = selected
    ? selected.subCategories.map((sub) => sub.id).join(",")
    : null;
  useEffect(() => {
    const subcategoryId = getValues("subcategoryId");
    if (
      knownSubcategoryIds !== null &&
      subcategoryId &&
      !knownSubcategoryIds.split(",").includes(subcategoryId)
    ) {
      setValue("subcategoryId", undefined);
    }
  }, [knownSubcategoryIds, getValues, setValue]);

  return (
    <>
      <SelectField<CategoryFormValues>
        name='categoryId'
        label='Category'
        placeholder='Select category'
        options={categoryOptions}
      />
      <SelectField<CategoryFormValues>
        name='subcategoryId'
        label='Subcategory (optional)'
        placeholder={
          subcategoryOptions.length ? "Select subcategory" : "No subcategories"
        }
        options={subcategoryOptions}
        disabled={!subcategoryOptions.length}
      />
    </>
  );
};

const CategoryFields = ({ current }: CategoryFieldsProps) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      <Field className='sm:col-span-2'>
        <FieldLabel htmlFor='category-search'>Find a category</FieldLabel>
        <Input
          id='category-search'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Type to search categories'
        />
      </Field>
      <Suspense
        fallback={
          <>
            <Skeleton className='h-9 w-full' />
            <Skeleton className='h-9 w-full' />
          </>
        }
      >
        <CategoryOptions search={debouncedSearch} current={current} />
      </Suspense>
    </div>
  );
};

export default CategoryFields;
